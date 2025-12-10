import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDependencies1765322787675 implements MigrationInterface {
    name = 'AddDependencies1765322787675'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "task_dependencies" ("id" SERIAL NOT NULL, "source_task_id" integer NOT NULL, "target_task_id" integer NOT NULL, "type" "public"."task_dependencies_type_enum" NOT NULL, "note" character varying(255), "created_by" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_b70a601ab5bb9b2c7710229f655" UNIQUE ("source_task_id", "target_task_id", "type"), CONSTRAINT "PK_e31de0e173af595a21c4ec8e48b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_a97bfc5bf1f93cfdf477fd7606f" FOREIGN KEY ("source_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_2b1ff0f247bcfe867d9fda93d57" FOREIGN KEY ("target_task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" ADD CONSTRAINT "FK_4a251b37965df3adc13d3f37ddb" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_4a251b37965df3adc13d3f37ddb"`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_2b1ff0f247bcfe867d9fda93d57"`);
        await queryRunner.query(`ALTER TABLE "task_dependencies" DROP CONSTRAINT "FK_a97bfc5bf1f93cfdf477fd7606f"`);
        await queryRunner.query(`DROP TABLE "task_dependencies"`);
    }

}
